import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import sanitizeHtml from 'sanitize-html';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowRoomSettingsModal } from '../../../store/slices/roomSettingsSlice';
import Modal from '../../../helpers/ui/modal';
import Tabs from '../../../helpers/ui/tabs';
import ApplicationSettings from './application';
import DataSavings from './dataSavings';
import Ingress from './ingress';
import SipDialIn from './sipDialIn';
import {
  ZL_MEET_CREDIT_TEXT,
  ZL_MEET_SHOW_VERSION_FOOTER,
} from '../../../helpers/branding';

declare const PNM_VERSION: string;

const RoomSettings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const {
    serverVersion,
    currentUser,
    copyright_conf,
    ingressFeatures,
    sipDialInFeatures,
  } = useMemo(() => {
    const session = store.getState().session;
    return {
      serverVersion: session.serverVersion,
      currentUser: session.currentUser,
      copyright_conf: session.currentRoom.metadata?.copyrightConf,
      ingressFeatures:
        session.currentRoom.metadata?.roomFeatures?.ingressFeatures,
      sipDialInFeatures:
        session.currentRoom.metadata?.roomFeatures?.sipDialInFeatures,
    };
  }, []);

  const isShowRoomSettingsModal = useAppSelector(
    (state) => state.roomSettings.isShowRoomSettingsModal,
  );

  const baseCategories = {
    'header.room-settings.application': <ApplicationSettings />,
    'header.room-settings.data-savings': <DataSavings />,
  };
  if (currentUser?.metadata?.isAdmin) {
    if (ingressFeatures?.isAllow) {
      baseCategories['header.room-settings.ingress'] = <Ingress />;
    }
    if (sipDialInFeatures?.isAllow) {
      baseCategories['header.room-settings.sip-dial-in'] = <SipDialIn />;
    }
  }
  const tabItems = Object.keys(baseCategories).map((k) => ({
    id: k,
    title: t(k),
    content: baseCategories[k],
  }));

  const closeModal = () => {
    dispatch(updateShowRoomSettingsModal(false));
  };

  if (!isShowRoomSettingsModal) {
    return null;
  }

  /**
   * Renders the room-settings footer credit line.
   * Default ZenLeader copy is Blue Ocean Digital; version line is opt-in via flag.
   */
  const renderModalFooter = () => {
    let text = ZL_MEET_CREDIT_TEXT;

    if (ZL_MEET_SHOW_VERSION_FOOTER) {
      let legacy = '';
      if (
        copyright_conf &&
        copyright_conf.display &&
        copyright_conf.text !== ''
      ) {
        legacy = sanitizeHtml(copyright_conf.text, {
          allowedTags: ['b', 'i', 'em', 'strong', 'a'],
          allowedAttributes: {
            a: ['href', 'target'],
          },
        }).concat('&nbsp;');
      }
      legacy += t('plugnmeet-server-client-version', {
        server: serverVersion,
        client: PNM_VERSION,
      });
      text = legacy;
    }

    return (
      <div
        className="absolute inset-x-0 -bottom-4 text-center text-Gray-950 dark:text-white text-xs"
        dangerouslySetInnerHTML={{ __html: text }}
      ></div>
    );
  };

  return (
    <Modal
      show={true}
      onClose={closeModal}
      title={t('header.room-settings.title')}
      maxWidth="max-w-2xl header-room-settings"
    >
      <div className="wrap relative">
        <Tabs
          uniqueKey="roomSettings"
          items={tabItems}
          tabPanelsCss="min-h-[316px]"
        />
        {renderModalFooter()}
      </div>
    </Modal>
  );
};

export default RoomSettings;
