export function prepareRegistrationData(form) {
  const data = new FormData(form);
  const logo = data.get("logo");

  if (logo instanceof File && logo.size === 0) {
    data.delete("logo");
  }

  data.set("acceptsTerms", data.get("acceptsTerms") ? "true" : "false");
  return data;
}
