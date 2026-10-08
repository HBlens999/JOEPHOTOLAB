import { PhotoDocument, Layer } from "../types/document";

const DB_NAME = "Joephotolab_Storage";
const STORE_NAME = "documents";
const DB_VERSION = 1;

// Single IndexedDB record used for the current editor session. This must live
// in this module because both saveDocumentToIDB and loadDocumentFromIDB use it.
const CURRENT_SESSION_ID = "current_session_doc_v2";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves document state and layer canvases to IndexedDB
 */
export async function saveDocumentToIDB(doc: PhotoDocument): Promise<void> {
  try {
    const db = await openDB();

    // Serialize layer canvases into PNG Blobs
    const serializedLayers = await Promise.all(
      doc.layers.map(async (l) => {
        let canvasBlob: Blob | null = null;
        if (l.canvas) {
          canvasBlob = await new Promise<Blob | null>((res) =>
            l.canvas!.toBlob((b) => res(b), "image/png")
          );
        }

        let maskBlob: Blob | null = null;
        if (l.mask?.canvas) {
          maskBlob = await new Promise<Blob | null>((res) =>
            l.mask!.canvas.toBlob((b) => res(b), "image/png")
          );
        }

        return {
          ...l,
          canvasBlob,
          maskBlob,
          canvas: undefined,
          mask: l.mask ? { ...l.mask, canvas: undefined } : undefined,
        };
      })
    );

    const record = {
      id: CURRENT_SESSION_ID,
      name: doc.name,
      width: doc.width,
      height: doc.height,
      resolution: doc.resolution,
      colorSpace: doc.colorSpace,
      bitDepth: doc.bitDepth,
      backgroundColor: doc.backgroundColor,
      activeLayerId: doc.activeLayerId,
      selectedLayerIds: doc.selectedLayerIds,
      guides: doc.guides,
      rulers: doc.rulers,
      grid: doc.grid,
      zoom: doc.zoom,
      panX: doc.panX,
      panY: doc.panY,
      rawMetadata: doc.rawMetadata,
      rawAdjustments: doc.rawAdjustments,
      savedAt: Date.now(),
      layers: serializedLayers,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to autosave document to IndexedDB:", err);
  }
}

/**
 * Loads document from IndexedDB
 */
export async function loadDocumentFromIDB(id: string = CURRENT_SESSION_ID): Promise<PhotoDocument | null> {
  try {
    const db = await openDB();
    const record: any = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    // Reconstruct layer canvases from Blobs
    const restoredLayers: Layer[] = await Promise.all(
      record.layers.map(async (l: any) => {
        let canvas: HTMLCanvasElement | undefined;
        if (l.canvasBlob) {
          const img = await blobToImage(l.canvasBlob);
          canvas = document.createElement("canvas");
          canvas.width = l.width || img.naturalWidth;
          canvas.height = l.height || img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
        }

        let mask = undefined;
        if (l.maskBlob) {
          const maskImg = await blobToImage(l.maskBlob);
          const mCanvas = document.createElement("canvas");
          mCanvas.width = l.width || maskImg.naturalWidth;
          mCanvas.height = l.height || maskImg.naturalHeight;
          const mCtx = mCanvas.getContext("2d");
          mCtx?.drawImage(maskImg, 0, 0);

          mask = {
            ...l.mask,
            canvas: mCanvas,
          };
        }

        return {
          ...l,
          canvas,
          mask,
        };
      })
    );

    return {
      id: record.id,
      name: record.name,
      width: record.width,
      height: record.height,
      resolution: record.resolution,
      colorSpace: record.colorSpace,
      bitDepth: record.bitDepth,
      backgroundColor: record.backgroundColor,
      activeLayerId: record.activeLayerId,
      selectedLayerIds: record.selectedLayerIds || [],
      guides: record.guides || [],
      rulers: record.rulers ?? true,
      grid: record.grid || { visible: false, size: 20 },
      zoom: record.zoom || 1.0,
      panX: record.panX || 0,
      panY: record.panY || 0,
      rawMetadata: record.rawMetadata,
      rawAdjustments: record.rawAdjustments,
      layers: restoredLayers,
    };
  } catch (err) {
    console.warn("Could not restore document from IndexedDB:", err);
    return null;
  }
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Exports project as a downloadable .jpl file
 */
export async function exportProjectJPL(doc: PhotoDocument): Promise<void> {
  const serializedDoc = {
    version: "1.0",
    name: doc.name,
    width: doc.width,
    height: doc.height,
    resolution: doc.resolution,
    colorSpace: doc.colorSpace,
    bitDepth: doc.bitDepth,
    backgroundColor: doc.backgroundColor,
    layers: await Promise.all(
      doc.layers.map(async (l) => ({
        ...l,
        canvasDataURL: l.canvas ? l.canvas.toDataURL("image/png") : null,
        maskDataURL: l.mask?.canvas ? l.mask.canvas.toDataURL("image/png") : null,
        canvas: undefined,
        mask: undefined,
      }))
    ),
  };

  const json = JSON.stringify(serializedDoc, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name || "project"}.jpl`;
  a.click();
  URL.revokeObjectURL(url);
}
