import { createFileRoute } from "@tanstack/react-router";
import Sourcing from "@/pages/Sourcing";

export const Route = createFileRoute("/sourcing/$hearfrom")({
  component: Sourcing,
});
