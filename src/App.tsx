import { useState } from "react";
import { Court } from "./components/Court";
import { TitleScreen } from "./components/TitleScreen";

export default function App() {
  const [started, setStarted] = useState(false);
  if (!started) return <TitleScreen onStart={() => setStarted(true)} />;
  return <Court />;
}
