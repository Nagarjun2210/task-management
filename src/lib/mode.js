// APP_MODE=viewer makes a deployment read-only. Enforced on the server,
// so hiding buttons in the UI is not the only protection.
export const isViewer = () => process.env.APP_MODE === "viewer";

export const readOnlyResponse = () =>
  Response.json({ error: "This is a read-only view" }, { status: 403 });
