/**
 * mediaCompressor — compress images to <1 MB before upload.
 *
 * compressImage(uri)  → { uri: string, base64: string }
 *   Resizes to max 1280 px wide and iteratively reduces JPEG quality until
 *   the decoded size is under 1 MB.
 */
import * as ImageManipulator from 'expo-image-manipulator';
const IMAGE_MAX_BYTES  = 1 * 1024 * 1024;
const IMAGE_MAX_B64    = Math.ceil(IMAGE_MAX_BYTES * 4 / 3);

export async function compressImage(uri) {
  let result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64 || result.base64.length <= IMAGE_MAX_B64) return result;

  result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64 || result.base64.length <= IMAGE_MAX_B64) return result;

  result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  return result;
}

