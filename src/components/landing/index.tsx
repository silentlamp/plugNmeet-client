import React, {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';
import {
  addAudioDevices,
  addVideoDevices,
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
} from '../../store/slices/roomSettingsSlice';
import { Volume } from '../../assets/Icons/Volume';
import { roomConnectionStatus } from '../app/helper';
import { getNatsConn } from '../../helpers/nats';
import { useMediaDevices } from './hooks/useMediaDevices';
import { MicrophoneOff } from '../../assets/Icons/MicrophoneOff';
import { CameraOff } from '../../assets/Icons/CameraOff';
import { LoadingIcon } from '../../assets/Icons/Loading';
import { resolveZenLeaderLogoPath } from '../../helpers/branding';
import { getConfigValue } from '../../helpers/utils';

import MicrophoneIcon from './microphone';
import WebcamIcon from './webcam';
import WebcamPreview from '../footer/modals/webcam/webcamPreview';

interface StartupJoinModalProps {
  setIsAppReady: Dispatch<boolean>;
  roomConnectionStatus: roomConnectionStatus;
}

const ZL_GREEN = '#87C744';
const ZL_NAVY = '#1F3E72';

/**
 * Pre-join device lobby — ZenLeader-branded stage (preview-first), not the
 * stock PlugNMeet centered 50/50 preferences card.
 */
const Landing = ({
  setIsAppReady,
  roomConnectionStatus,
}: StartupJoinModalProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const logoSrc = useMemo(() => {
    const assetPath = getConfigValue(
      'staticAssetsPath',
      './assets',
      'STATIC_ASSETS_PATH',
    );
    return resolveZenLeaderLogoPath(assetPath);
  }, []);

  // static values
  const { isWebcamAllowed } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;

    let show = true;
    if (!roomFeatures?.allowWebcams) {
      show = false;
    } else if (roomFeatures?.adminOnlyWebcams && !isAdmin) {
      show = false;
    }

    return {
      isWebcamAllowed: show,
    };
  }, []);

  const isStartup = useAppSelector((state) => state.session.isStartup);
  const roomTitle = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomTitle,
  );
  const userName = useAppSelector((state) => state.session.currentUser?.name);
  const waitForApproval = useAppSelector(
    (state) => state.session.currentUser?.metadata?.waitForApproval,
  );
  const waitingRoomMessage = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.waitingRoomFeatures
        ?.waitingRoomMsg,
  );
  const lockMicrophone = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const lockWebcam = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWebcam,
  );

  const {
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    enableMediaDevices,
    disableWebcam,
    disableMic,
  } = useMediaDevices();

  const [showLoadingMsg, setShowLoadingMsg] = useState<string | undefined>(
    undefined,
  );
  const [isReadyToConn, setIsReadyToConn] = useState<boolean | undefined>(
    undefined,
  );

  useEffect(() => {
    switch (roomConnectionStatus) {
      case 'media-server-conn-start':
        setShowLoadingMsg(t('landing.connecting-media-server'));
        break;
      case 'media-server-conn-established':
        dispatch(toggleStartup(false));
        setIsAppReady(true);
        setShowLoadingMsg(undefined);
        break;
    }
  }, [roomConnectionStatus, t, dispatch, setIsAppReady]);

  useEffect(() => {
    if (waitForApproval) {
      if (typeof isReadyToConn !== 'undefined') {
        setShowLoadingMsg(t('landing.waiting-for-approval-title'));
      }
    } else {
      if (isReadyToConn) {
        const conn = getNatsConn();
        if (conn) {
          setShowLoadingMsg(t('landing.finalizing-app'));
          conn.finalizeAppConn();
        }
      }
    }
  }, [t, waitForApproval, isReadyToConn]);

  const openConn = useCallback(() => {
    if (selectedVideoDevice !== '') {
      dispatch(updateSelectedVideoDevice(selectedVideoDevice));
      dispatch(addVideoDevices(videoDevices));
    }
    if (selectedAudioDevice !== '') {
      dispatch(updateSelectedAudioDevice(selectedAudioDevice));
      dispatch(addAudioDevices(audioDevices));
    }

    setIsReadyToConn(true);
  }, [
    selectedAudioDevice,
    selectedVideoDevice,
    dispatch,
    videoDevices,
    audioDevices,
  ]);

  const getJoinPrompt = useCallback(() => {
    if (lockMicrophone && (lockWebcam || !isWebcamAllowed)) {
      return t('landing.join-prompt-both-locked');
    } else if (lockMicrophone) {
      return t('landing.join-prompt-mic-locked');
    } else if (lockWebcam || !isWebcamAllowed) {
      return t('landing.join-prompt-cam-locked');
    }
    return t('landing.join-prompt');
  }, [lockMicrophone, lockWebcam, isWebcamAllowed, t]);

  const getEnableDeviceButton = useCallback(() => {
    if (lockMicrophone) {
      return {
        text: t('landing.enable-cam-btn'),
        action: () => enableMediaDevices('video'),
      };
    } else if (lockWebcam || !isWebcamAllowed) {
      return {
        text: t('landing.enable-mic-btn'),
        action: () => enableMediaDevices('audio'),
      };
    }
    return {
      text: t('landing.enable-mic-cam-btn'),
      action: () => enableMediaDevices('both'),
    };
  }, [t, lockMicrophone, lockWebcam, isWebcamAllowed, enableMediaDevices]);

  const primaryBtnClass =
    'zl-lobby-btn-primary w-full min-h-11 cursor-pointer text-sm 3xl:text-base font-semibold rounded-xl bg-Blue text-white border border-Blue/30 hover:brightness-105 active:brightness-95 transition-all duration-200 shadow-button-shadow disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed disabled:shadow-none';
  const secondaryBtnClass =
    'zl-lobby-btn-secondary w-full min-h-11 cursor-pointer text-sm 3xl:text-base font-semibold rounded-xl bg-white/90 dark:bg-dark-secondary2 text-Gray-950 dark:text-white border border-Gray-200 dark:border-Gray-700 hover:border-Blue/50 hover:bg-Blue/10 flex justify-center items-center gap-2 transition-all duration-200 disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed';

  const deviceControls = (
    <div className="micro-cam-wrap flex justify-center gap-3 empty:hidden">
      {lockMicrophone ? (
        <div className="microphone-wrap relative cursor-not-allowed size-12 rounded-full flex items-center justify-center bg-black/55 border border-white/15 backdrop-blur-sm">
          <MicrophoneOff classes="h-5 w-5 text-red-300" />
          <i className="pnm-lock absolute -top-0.5 -right-0.5 z-10 text-red-400 text-xs" />
        </div>
      ) : (
        <MicrophoneIcon
          audioDevices={audioDevices}
          enableMediaDevices={enableMediaDevices}
          disableMic={disableMic}
          setSelectedAudioDevice={setSelectedAudioDevice}
          selectedAudioDevice={selectedAudioDevice}
        />
      )}
      {lockWebcam || !isWebcamAllowed ? (
        <div className="cam-wrap relative cursor-not-allowed size-12 rounded-full flex items-center justify-center bg-black/55 border border-white/15 backdrop-blur-sm">
          <CameraOff classes="h-5 w-5 text-red-300" />
          <i className="pnm-lock absolute -top-0.5 -right-0.5 z-10 text-red-400 text-xs" />
        </div>
      ) : (
        <WebcamIcon
          videoDevices={videoDevices}
          enableMediaDevices={enableMediaDevices}
          disableWebcam={disableWebcam}
          setSelectedVideoDevice={setSelectedVideoDevice}
          selectedVideoDevice={selectedVideoDevice}
        />
      )}
    </div>
  );

  const joinActions = showLoadingMsg ? (
    <div className="waiting-room-contents w-full">
      {waitForApproval ? (
        <div className="texts text-center lg:text-left space-y-3">
          <h3 className="font-semibold text-lg 3xl:text-xl text-Gray-950 dark:text-white leading-snug flex items-center justify-center lg:justify-start gap-2.5">
            <LoadingIcon
              className="inline size-5 text-Gray-200 animate-spin shrink-0"
              fillColor={ZL_GREEN}
            />
            {t('landing.waiting-for-approval-title')}
          </h3>
          <p className="text-sm 3xl:text-base text-Gray-800 dark:text-white/80 lg:pl-8 leading-relaxed">
            {waitingRoomMessage || t('notifications.waiting-for-approval')}
          </p>
        </div>
      ) : (
        <div className="texts text-center lg:text-left">
          <h3 className="font-semibold text-lg 3xl:text-xl text-Gray-950 dark:text-white leading-snug flex items-center justify-center lg:justify-start gap-2.5">
            <LoadingIcon
              className="inline size-6 text-Gray-200 animate-spin shrink-0"
              fillColor={ZL_GREEN}
            />
            {showLoadingMsg}
          </h3>
        </div>
      )}
    </div>
  ) : (
    <div className="inner relative w-full">
      <div className="texts text-center lg:text-left space-y-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: ZL_NAVY }}
        >
          ZenLeader Meet
        </p>
        <h3 className="font-semibold text-xl 3xl:text-2xl text-Gray-950 dark:text-white leading-snug tracking-tight">
          {t('landing.ready-to-join')}
        </h3>
        <p className="text-sm 3xl:text-base text-Gray-800 dark:text-white/80 leading-relaxed max-w-prose mx-auto lg:mx-0">
          {getJoinPrompt()}
        </p>
        {userName ? (
          <p className="text-xs text-Gray-700 dark:text-white/60 pt-1">
            {userName}
          </p>
        ) : null}
      </div>
      <div className="buttons grid gap-2.5 w-full pt-8">
        {lockMicrophone && (lockWebcam || !isWebcamAllowed) ? (
          <button
            id="listenOnlyJoin"
            type="button"
            disabled={isReadyToConn === true}
            className={secondaryBtnClass}
            onClick={() => openConn()}
          >
            {t('landing.join-as-listener-btn')}
            <Volume />
          </button>
        ) : selectedAudioDevice !== '' || selectedVideoDevice !== '' ? (
          <button
            type="button"
            disabled={isReadyToConn === true}
            className={primaryBtnClass}
            onClick={() => openConn()}
          >
            {t('join')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={primaryBtnClass}
              disabled={isReadyToConn === true}
              onClick={getEnableDeviceButton().action}
            >
              <span className="relative flex items-center justify-center gap-2">
                {getEnableDeviceButton().text}
              </span>
            </button>
            <button
              id="listenOnlyJoin"
              type="button"
              disabled={isReadyToConn === true}
              className={secondaryBtnClass}
              onClick={() => openConn()}
            >
              {t('landing.join-as-listener-btn')}
              <Volume />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    isStartup && (
      <div
        id="startupJoinModal"
        className="zl-lobby absolute inset-0 z-[80] min-h-full w-full flex flex-col overflow-auto dark:bg-dark-primary"
      >
        {/* Atmospheric brand field — not the stock gray modal wash */}
        <div
          className="pointer-events-none absolute inset-0 dark:hidden"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 12% 18%, rgba(135, 199, 68, 0.18), transparent 55%),
              radial-gradient(ellipse 55% 45% at 88% 82%, rgba(31, 62, 114, 0.22), transparent 50%),
              linear-gradient(165deg, #f4f7fb 0%, #eef2f7 42%, #e6edf5 100%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 15% 20%, rgba(135, 199, 68, 0.12), transparent 55%),
              radial-gradient(ellipse 50% 40% at 90% 80%, rgba(31, 62, 114, 0.35), transparent 50%),
              linear-gradient(165deg, #101114 0%, #141a24 50%, #1a2332 100%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231F3E72' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <header className="relative z-10 flex items-center justify-between gap-3 px-5 sm:px-8 pt-5 sm:pt-7 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt="ZenLeader"
              className="h-9 w-auto max-w-[120px] object-contain shrink-0"
            />
            <div className="hidden sm:block h-6 w-px bg-Gray-300/80" />
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-medium text-Gray-700 truncate">
                {t('landing.modal-title')}
              </p>
              {roomTitle ? (
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: ZL_NAVY }}
                  title={roomTitle}
                >
                  {roomTitle}
                </p>
              ) : null}
            </div>
          </div>
          {roomTitle ? (
            <p
              className="sm:hidden text-sm font-semibold truncate max-w-[50%]"
              style={{ color: ZL_NAVY }}
            >
              {roomTitle}
            </p>
          ) : null}
        </header>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 pb-8 pt-2">
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-stretch">
            {/* Preview stage — dominant visual plane */}
            <section className="lg:col-span-7 xl:col-span-8 flex flex-col">
              <div className="relative flex-1 min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] rounded-3xl overflow-hidden bg-[#0f1724] shadow-[0_24px_60px_-20px_rgba(31,62,114,0.45)] ring-1 ring-black/10">
                <div className="absolute inset-0 camera">
                  {selectedVideoDevice !== '' ? (
                    <WebcamPreview deviceId={selectedVideoDevice} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                      <div
                        className="size-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(135, 199, 68, 0.15)' }}
                      >
                        <CameraOff classes="h-7 w-7 text-white/70" />
                      </div>
                      <p className="text-sm text-white/70 max-w-[28ch] leading-relaxed">
                        {t('landing.join-prompt')}
                      </p>
                    </div>
                  )}
                </div>
                {/* Floating device dock on the preview */}
                <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-5 pt-12 bg-gradient-to-t from-black/55 via-black/20 to-transparent">
                  {deviceControls}
                </div>
              </div>
            </section>

            {/* Join rail — compact brand panel (not a mirrored 50% card) */}
            <aside className="lg:col-span-5 xl:col-span-4 flex">
              <div className="w-full rounded-3xl bg-white/90 dark:bg-dark-secondary/95 backdrop-blur-md border border-white/70 dark:border-Gray-700 shadow-[0_20px_50px_-24px_rgba(31,62,114,0.35)] p-6 sm:p-7 3xl:p-8 flex flex-col justify-center">
                {joinActions}
              </div>
            </aside>
          </div>
        </div>
      </div>
    )
  );
};

export default Landing;
