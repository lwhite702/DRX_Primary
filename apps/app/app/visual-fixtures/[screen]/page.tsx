import { notFound } from "next/navigation";
import {
  isOperatorFixtureScreen,
  OperatorScreenFixture,
} from "@/components/visual-fixtures/operator-screen-fixture";

export default async function VisualFixturePage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  if (process.env.VISUAL_FIXTURES !== "true") {
    notFound();
  }

  const { screen } = await params;

  if (!isOperatorFixtureScreen(screen)) {
    notFound();
  }

  return <OperatorScreenFixture screen={screen} />;
}
