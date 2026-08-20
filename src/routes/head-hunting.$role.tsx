import { createFileRoute } from "@tanstack/react-router";
import HeadHunting from "@/pages/HeadHunting";

export const Route = createFileRoute("/head-hunting/$role")({
  component: HeadHunting,
});
