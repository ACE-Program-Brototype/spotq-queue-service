import app from "./app.js";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(` Queue Service running on port ${PORT}`);
});
