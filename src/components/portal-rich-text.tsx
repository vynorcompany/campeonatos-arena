export function PortalRichText({ text }: { text: string }) {
  return <>{text.split("\n").map((line, lineIndex) => <span key={`${lineIndex}-${line}`} className="portal-rich-text-line">{line.split("**").map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : part)}{lineIndex < text.split("\n").length - 1 ? <br /> : null}</span>)}</>;
}
