export async function POST(request: Request) {
  const form = await request.formData();
  const required = ["name", "email", "company", "brief"];
  const missing = required.some((key) => !String(form.get(key) ?? "").trim());
  if (missing) return Response.json({ message: "Please complete all required fields." }, { status: 400 });
  return Response.json({ message: "Thank you—your request has been received in this site preview. Export-team routing will be connected before launch." });
}
