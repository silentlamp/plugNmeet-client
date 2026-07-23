import { ZenBlockLoader } from '../../components/extra-pages/ZenBreathingLoader';

type PortalLoadingProps = {
  message: string;
};

/**
 * Portal card loading state — compact block wave (parity with admin inline loader).
 */
export function PortalLoading({ message }: PortalLoadingProps) {
  return (
    <div className="zl-loading">
      <ZenBlockLoader size={20} compact label={message} />
      <span>{message}</span>
    </div>
  );
}

export default PortalLoading;
