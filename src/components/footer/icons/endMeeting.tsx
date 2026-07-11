import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  RoomEndAPIReqSchema,
} from 'plugnmeet-protocol-js';
import clsx from 'clsx';

import { store } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { getNatsConn } from '../../../helpers/nats';
import ConfirmationModal from '../../../helpers/ui/confirmationModal';
import { EndMeetingIconSVG } from '../../../assets/Icons/EndMeetingIconSVG';

/**
 * Host leave control:
 * - Leave only → local endSession (room stays open for others)
 * - End for everyone → POST /api/endRoom
 * Non-admin: leave only.
 */
const EndMeetingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'leave' | 'end'>('leave');
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const { t } = useTranslation();
  const conn = getNatsConn();
  const { isAdmin, roomId, showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      isAdmin: session.currentUser?.metadata?.isAdmin,
      roomId: session.currentRoom.roomId,
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  const openLeave = () => {
    setMode('leave');
    setIsOpen(true);
  };

  const openEnd = () => {
    setMode('end');
    setIsOpen(true);
  };

  const onConfirm = useCallback(async () => {
    if (isBusy) {
      return;
    }
    setIsBusy(true);

    if (!isAdmin || mode === 'leave') {
      await conn.endSession('notifications.user-logged-out');
    } else {
      const id = toast.loading(t('notifications.ending-session'), {
        type: 'info',
      });

      const body = create(RoomEndAPIReqSchema, {
        roomId: roomId,
      });
      const r = await sendAPIRequest(
        'endRoom',
        toBinary(RoomEndAPIReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      if (!res.status) {
        toast.update(id, {
          render: t(res.msg),
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        toast.dismiss(id);
      }
    }
    setIsBusy(false);
    setIsOpen(false);
  }, [isBusy, isAdmin, mode, conn, roomId, t]);

  const buttonClasses = clsx(
    'relative footer-icon cursor-pointer w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px]',
  );
  const leaveInnerClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Gray-700 border border-Gray-800 transition-all duration-300 hover:bg-Gray-900 shadow-button-shadow',
    {
      'has-tooltip': showTooltip,
    },
  );
  const endInnerClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow',
    {
      'has-tooltip': showTooltip,
    },
  );

  const alertText =
    isAdmin && mode === 'end'
      ? t('header.menus.alert.end').toString()
      : t('header.menus.alert.logout').toString();

  return (
    <>
      {isAdmin ? (
        <div className="flex items-center gap-1.5">
          <div className={buttonClasses} onClick={openLeave}>
            <div className={leaveInnerClasses}>
              <span className="tooltip tooltip-right right-0">
                {t('header.menus.logout')}
              </span>
              <i className="pnm-logout text-lg" />
            </div>
          </div>
          <div className={buttonClasses} onClick={openEnd}>
            <div className={endInnerClasses}>
              <span className="tooltip tooltip-right right-0">
                {t('header.menus.end')}
              </span>
              <EndMeetingIconSVG />
            </div>
          </div>
        </div>
      ) : (
        <div className={buttonClasses} onClick={openLeave}>
          <div className={endInnerClasses}>
            <span className="tooltip tooltip-right right-0">
              {t('header.menus.logout')}
            </span>
            <EndMeetingIconSVG />
          </div>
        </div>
      )}

      <ConfirmationModal
        show={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={onConfirm}
        title={t('header.menus.alert.confirm')}
        text={alertText}
      />
    </>
  );
};

export default EndMeetingButton;
