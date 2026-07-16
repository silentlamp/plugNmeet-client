import { ZenBreathingLoader } from '../../components/extra-pages/ZenBreathingLoader';

type PortalLoadingProps = {
  message: string;
};

/**
 * Portal card loading state — zen breathing rings + status text.
 */
export function PortalLoading({ message }: PortalLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <ZenBreathingLoader size={56} label={message} />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

export default PortalLoading;
