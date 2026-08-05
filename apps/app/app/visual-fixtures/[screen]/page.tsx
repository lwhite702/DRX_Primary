import { notFound } from "next/navigation";
import {
  isOperatorFixtureScreen,
  OperatorScreenFixture,
} from "@/components/visual-fixtures/operator-screen-fixture";
import { isAuthVisualFixtureEnabled } from "@/lib/auth/visual-fixtures";

export default async function VisualFixturePage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  if (!isAuthVisualFixtureEnabled()) {
    notFound();
  }

  const { screen } = await params;

  if (!isOperatorFixtureScreen(screen)) {
    notFound();
  }

  return <OperatorScreenFixture screen={screen} />;
}
