import { ZenBreathingLoader } from '../../components/extra-pages/ZenBreathingLoader';

type PortalLoadingProps = {
  message: string;
};

/**
 * Portal card loading state — zen breathing rings + status text.
 */
export function PortalLoading({ message }: PortalLoadingProps) {
  return (
    <div className="zl-loading">
      <ZenBreathingLoader size={56} label={message} />
      <span>{message}</span>
    </div>
  );
}

export default PortalLoading;
