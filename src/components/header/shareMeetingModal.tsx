import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import copy from 'copy-text-to-clipboard';

import { useAppSelector } from '../../store';
import { getMeetingShareUrl } from '../../helpers/utils';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

interface ShareMeetingModalProps {
  show: boolean;
  onClose: () => void;
}

/**
 * Dialog that shows a copyable Google Meet-style share link for the current room.
 */
const ShareMeetingModal = ({ show, onClose }: ShareMeetingModalProps) => {
  const { t } = useTranslation();
  const roomId = useAppSelector((state) => state.session.currentRoom.roomId);
  const [copyLabel, setCopyLabel] = useState(
    t('header.share-meeting.copy').toString(),
  );

  const shareUrl = useMemo(
    () => (roomId ? getMeetingShareUrl(roomId) : ''),
    [roomId],
  );

  const copyUrl = useCallback(() => {
    if (!shareUrl) {
      return;
    }
    copy(shareUrl);
    setCopyLabel(t('header.share-meeting.copied').toString());
    setTimeout(() => {
      setCopyLabel(t('header.share-meeting.copy').toString());
    }, 2000);
  }, [shareUrl, t]);

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        as="div"
        className="shareMeetingModal fixed inset-0 z-[100000] w-screen overflow-y-auto bg-Gray-950/70 dark:bg-Gray-950/80"
        onClose={onClose}
      >
        <div className="min-h-full flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md bg-white dark:bg-dark-primary border border-Gray-200 dark:border-Gray-800 shadow-virtualPOP p-4 rounded-xl overflow-hidden">
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-base font-semibold leading-7 text-Gray-950 dark:text-white mb-2 border-b border-Gray-300 dark:border-Gray-800 pb-2"
              >
                <span>{t('header.share-meeting.title')}</span>
                <Button className="cursor-pointer" onClick={onClose}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>

              <p className="text-sm text-Gray-700 dark:text-Gray-300 mb-3">
                {t('header.share-meeting.description')}
              </p>

              {roomId ? (
                <p className="text-sm text-Gray-950 dark:text-white mb-3">
                  <span className="font-medium">
                    {t('header.share-meeting.room-code')}:{' '}
                  </span>
                  <code className="font-mono">{roomId}</code>
                </p>
              ) : null}

              <div className="wrap flex items-center gap-1">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="border border-Gray-300 dark:border-Gray-800 bg-white dark:bg-dark-primary shadow-input block px-3 py-2 w-full h-9 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] text-Gray-950 dark:text-white text-sm"
                />
                <button
                  type="button"
                  onClick={copyUrl}
                  disabled={!shareUrl}
                  className="primary-button h-9 shrink-0 px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copyLabel}
                </button>
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default React.memo(ShareMeetingModal);
