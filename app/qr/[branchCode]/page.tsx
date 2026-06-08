import { QRDisplayScreen } from "@/components/qr/qr-display-screen";

type PageProps = {
  params: Promise<{ branchCode: string }>;
};

export default async function QRBranchPage({ params }: PageProps) {
  const { branchCode } = await params;
  return <QRDisplayScreen branchCode={branchCode} />;
}
