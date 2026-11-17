export type Profile = { name: string; bio: string; focus: string; photo: string };

export function readProfile(saved: string | null): Profile | null {
  if (!saved) return null;
  try {
    const { name, bio, focus, photo } = JSON.parse(saved) as Partial<Profile>;
    if (
      typeof name === "string" &&
      name.trim() &&
      typeof bio === "string" &&
      typeof focus === "string" &&
      typeof photo === "string"
    ) {
      return {
        name,
        bio,
        focus,
        photo: /^data:image\/(webp|png);base64,/.test(photo) ? photo : "",
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a photo under 10 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This photo could not be opened. Try another image.");
  });
  try {
    const canvas = document.createElement("canvas");
    const crop = Math.min(bitmap.width, bitmap.height);
    canvas.width = canvas.height = Math.min(crop, 384);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This device could not prepare the photo.");
    context.drawImage(
      bitmap,
      (bitmap.width - crop) / 2,
      (bitmap.height - crop) / 2,
      crop,
      crop,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvas.toDataURL("image/webp", 0.85);
  } finally {
    bitmap.close();
  }
}
