import MatildaPage from "./pages/MatildaPage";
import MumPage from "./pages/MumPage";

export default function App() {
  const path = window.location.pathname;
  if (path === "/mum") return <MumPage />;
  return <MatildaPage />;
}
