import { ZenBlockLoader } from '../../components/extra-pages/ZenBreathingLoader';

type PortalLoadingProps = {
  message: string;
};

/**
 * Portal card loading state — horizontal block wave + status text.
 */
export function PortalLoading({ message }: PortalLoadingProps) {
  return (
    <div className="zl-loading">
      <ZenBlockLoader size={36} label={message} />
      <span>{message}</span>
    </div>
  );
}

export default PortalLoading;
