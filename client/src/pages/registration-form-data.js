export function prepareRegistrationData(form) {
  const data = new FormData(form);
  const logo = data.get("logo");
  if (logo instanceof File && logo.size === 0) data.delete("logo");
  data.set("acceptsTerms", data.get("acceptsTerms") ? "true" : "false");
  return data;
}

const acceptedLogoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumLogoBytes = 2 * 1024 * 1024;

export function validateRegistrationForm(form) {
  const logo = form.elements.namedItem("logo")?.files?.[0];
  const password = form.elements.namedItem("password")?.value;
  const confirmPassword = form.elements.namedItem("confirmPassword")?.value;
  if (logo && !acceptedLogoTypes.has(logo.type)) return "Logoja duhet të jetë skedar JPG, PNG ose WebP.";
  if (logo && logo.size > maximumLogoBytes) return "Logoja nuk duhet të jetë më e madhe se 2 MB.";
  if (password !== confirmPassword) return "Fjalëkalimet nuk përputhen.";
  return null;
}
