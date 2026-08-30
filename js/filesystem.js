/******************************************************************************
 * filesystem.js
 *
 * Handles local photo directory selection.
 *
 * Behaviour
 * ---------
 * - Scans ONLY the selected directory.
 * - Does NOT enter subfolders.
 * - Matches images by filename WITHOUT extension.
 * - Prefers JPG/JPEG/PNG/etc. over HEIC/HEIF.
 * - Converts HEIC/HEIF to JPEG when no displayable equivalent exists.
 *
 ******************************************************************************/



 /******************************************************************************
  * Supported formats
  ******************************************************************************/
 
 const DIRECT_IMAGE_EXTENSIONS = [
 
     "jpg",
     "jpeg",
     "png",
     "gif",
     "bmp",
     "webp",
     "tif",
     "tiff",
     "avif"
 
 ];
 
 
 const HEIC_EXTENSIONS = [
 
     "heic",
     "heif"
 
 ];
 
 
 /******************************************************************************
  * Ask user to choose a directory
  ******************************************************************************/
 
 export async function choosePhotoDirectory() {
 
     if (!window.showDirectoryPicker) {
 
         throw new Error(
             "Your browser does not support the File System Access API."
         );
 
     }
 
 
     const directoryHandle =
         await window.showDirectoryPicker();
 
 
     const lookup = {};
 
 
     // IMPORTANT:
     //
     // We intentionally DO NOT call scanDirectory()
     // recursively.
     //
     // Only files directly inside the selected folder
     // are examined.
 
     for await (
         const entry
         of directoryHandle.values()
     ) {
 
         if (entry.kind !== "file")
             continue;
 
 
         const extension =
             getExtension(entry.name);
 
 
         if (
             !isImage(extension)
         ) {
 
             continue;
 
         }
 
 
         const stem =
             getStem(entry.name);
 
 
         const originalFile =
             await entry.getFile();
 
 
         // -------------------------------------------------------------
         // If this stem already exists, decide which file to keep.
         // -------------------------------------------------------------
 
         const existing =
             lookup[stem];
 
 
         // -------------------------------------------------------------
         // Direct image formats have priority over HEIC/HEIF.
         // -------------------------------------------------------------
 
         const isDirectImage =
             DIRECT_IMAGE_EXTENSIONS.includes(
                 extension
             );
 
 
         const isHEIC =
             HEIC_EXTENSIONS.includes(
                 extension
             );
 
 
         if (existing) {
 
             // Existing direct image wins.
             if (
                 existing.type === "direct"
             ) {
 
                 continue;
 
             }
 
 
             // Current direct image replaces HEIC.
             if (
                 isDirectImage
             ) {
 
                 URL.revokeObjectURL(
                     existing.url
                 );
 
 
                 lookup[stem] = {
 
                     type: "direct",
 
                     file: originalFile,
 
                     handle: entry,
 
                     filename: entry.name,
 
                     url:
                         URL.createObjectURL(
                             originalFile
                         )
 
                 };
 
 
                 continue;
 
             }
 
         }
 
 
         // -------------------------------------------------------------
         // Direct image
         // -------------------------------------------------------------
 
         if (isDirectImage) {
 
             lookup[stem] = {
 
                 type: "direct",
 
                 file: originalFile,
 
                 handle: entry,
 
                 filename: entry.name,
 
                 url:
                     URL.createObjectURL(
                         originalFile
                     )
 
             };
 
 
             continue;
 
         }
 
 
         // -------------------------------------------------------------
         // HEIC / HEIF
         //
         // We don't convert immediately.
         //
         // We first store it as a candidate. This is important because
         // a JPG with the same filename might appear later in the folder.
         // -------------------------------------------------------------
 
         if (isHEIC) {
 
             lookup[stem] = {
 
                 type: "heic",
 
                 file: originalFile,
 
                 handle: entry,
 
                 filename: entry.name,
 
                 url: null
 
             };
 
         }
 
     }
 
 
     // Store globally for later access
 
     if (typeof App !== "undefined") {
 
         App.imageLookup =
             lookup;
 
     }
 
 
     console.log(
         "Image lookup created:",
         lookup
     );
 
 
     return lookup;
 
 }
 
 
 /******************************************************************************
  * Attach image URLs to GeoPackage photos
  ******************************************************************************/
 
 export async function assignPhotoURLs(
     photos,
     lookup
 ) {
 
     for (const photo of photos) {
 
         // -------------------------------------------------------------
         // GPKG might contain:
         //
         // IMG_001.HEIC
         // IMG_001.JPG
         // IMG_001.PNG
         //
         // We ignore the extension and use:
         //
         // IMG_001
         // -------------------------------------------------------------
 
         const key =
             getStem(
                 String(photo.filename)
             );
 
 
         const image =
             lookup[key];
 
 
         console.log(
             "Matching:",
             photo.filename,
             "→",
             image
                 ? image.filename
                 : "NOT FOUND"
         );
 
 
         // -------------------------------------------------------------
         // No matching image
         // -------------------------------------------------------------
 
         if (!image) {
 
             console.warn(
                 "Image not found:",
                 photo.filename
             );
 
 
             photo.imageURL =
                 null;
 
             photo.file =
                 null;
 
             continue;
 
         }
 
 
         // -------------------------------------------------------------
         // Direct image:
         //
         // JPG / JPEG / PNG / WEBP / etc.
         // -------------------------------------------------------------
 
         if (
             image.type === "direct"
         ) {
 
             photo.imageURL =
                 image.url;
 
             photo.file =
                 image.file;
 
             photo.imageSource =
                 image.filename;
 
             continue;
 
         }
 
 
         // -------------------------------------------------------------
         // HEIC / HEIF:
         //
         // Convert only now, because we already know that there isn't
         // a JPG/PNG/etc. equivalent for this filename.
         // -------------------------------------------------------------
 
         if (
             image.type === "heic"
         ) {
 
             try {
 
                 console.log(
                     "Converting HEIC:",
                     image.filename
                 );
 
 
                 const convertedBlob =
                     await heic2any({
 
                         blob: image.file,
 
                         toType: "image/jpeg",
 
                         quality: 0.85
 
                     });
 
 
                 // heic2any can return a Blob or an array of Blobs.
 
                 const jpegBlob =
                     Array.isArray(
                         convertedBlob
                     )
                         ? convertedBlob[0]
                         : convertedBlob;
 
 
                 const jpegFile =
                     new File(
 
                         [jpegBlob],
 
                         `${key}.jpg`,
 
                         {
                             type:
                                 "image/jpeg"
                         }
 
                     );
 
 
                 const url =
                     URL.createObjectURL(
                         jpegFile
                     );
 
 
                 // Cache conversion
 
                 image.type =
                     "converted";
 
                 image.file =
                     jpegFile;
 
                 image.url =
                     url;
 
                 image.filename =
                     `${key}.jpg`;
 
 
                 photo.imageURL =
                     url;
 
                 photo.file =
                     jpegFile;
 
                 photo.imageSource =
                     `${key}.jpg`;
 
             }
 
             catch (error) {
 
                 console.error(
                     "HEIC conversion failed:",
                     image.filename,
                     error
                 );
 
 
                 photo.imageURL =
                     null;
 
                 photo.file =
                     null;
 
             }
 
         }
 
     }
 
 
     return photos;
 
 }
 
 
 /******************************************************************************
  * Get image URL from filename
  ******************************************************************************/
 
 export function getImageURL(
     filename,
     lookup
 ) {
 
     if (!filename)
         return null;
 
 
     const key =
         getStem(
             filename
         );
 
 
     return lookup[key]
         ? lookup[key].url
         : null;
 
 }
 
 
 /******************************************************************************
  * Get File object
  ******************************************************************************/
 
 export function getFile(
     filename,
     lookup
 ) {
 
     if (!filename)
         return null;
 
 
     const key =
         getStem(
             filename
         );
 
 
     return lookup[key]
         ? lookup[key].file
         : null;
 
 }
 
 
 /******************************************************************************
  * Release blob URLs
  ******************************************************************************/
 
 export function releaseLookup(
     lookup
 ) {
 
     for (const key in lookup) {
 
         if (
             lookup[key].url
         ) {
 
             URL.revokeObjectURL(
                 lookup[key].url
             );
 
         }
 
     }
 
 }
 
 
 /******************************************************************************
  * Check whether extension is supported
  ******************************************************************************/
 
 function isImage(
     extension
 ) {
 
     return (
 
         DIRECT_IMAGE_EXTENSIONS.includes(
             extension
         )
 
         ||
 
         HEIC_EXTENSIONS.includes(
             extension
         )
 
     );
 
 }
 
 
 /******************************************************************************
  * Extract extension
  ******************************************************************************/
 
 function getExtension(
     filename
 ) {
 
     const index =
         filename.lastIndexOf(".");
 
 
     if (index === -1)
         return "";
 
 
     return filename
         .substring(
             index + 1
         )
         .toLowerCase();
 
 }
 
 
 /******************************************************************************
  * Extract filename WITHOUT extension
  *
  * Examples:
  *
  * IMG_1234.HEIC → img_1234
  * IMG_1234.JPG  → img_1234
  * IMG_1234.PNG  → img_1234
  *
  ******************************************************************************/
 
 function getStem(
     filename
 ) {
 
     const basename =
         filename
             .split("/")
             .pop()
             .split("\\")
             .pop();
 
 
     const index =
         basename.lastIndexOf(".");
 
 
     if (index === -1) {
 
         return basename
             .toLowerCase();
 
     }
 
 
     return basename
         .substring(
             0,
             index
         )
         .toLowerCase();
 
 }
 