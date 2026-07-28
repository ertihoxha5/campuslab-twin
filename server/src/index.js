import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = createApp();

app.listen(port, () => {
  console.log(`API e CampusLab Twin po punon në portën ${port}.`);
});
