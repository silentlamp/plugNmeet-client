import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { isSupported } from '@twilio/video-processors';

import { Camera } from '../../assets/Icons/Camera';
import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import { updateShowVideoShareModal } from '../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch, useAppSelector } from '../../store';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import ShareWebcamModal from '../footer/modals/webcam';
import { inputMediaDeviceKind } from '../../helpers/utils';

interface WebcamIconProps {
  videoDevices: IMediaDevice[];
  enableMediaDevices(type: inputMediaDeviceKind): Promise<void>;
  disableWebcam(): void;
  setSelectedVideoDevice: (value: SetStateAction<string>) => void;
  selectedVideoDevice: string;
}

/**
 * Lobby camera control — circular glass dock for the ZenLeader preview stage.
 */
const WebcamIcon = ({
  videoDevices,
  enableMediaDevices,
  disableWebcam,
  setSelectedVideoDevice,
  selectedVideoDevice,
}: WebcamIconProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isOn = videoDevices.length > 0;

  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );

  return (
    <div
      className={`cam-wrap relative cursor-pointer flex items-center rounded-full border backdrop-blur-md transition-all duration-300 text-white ${
        isOn
          ? 'bg-Blue/90 border-Blue/40 shadow-[0_0_0_3px_rgba(135,199,68,0.28)]'
          : 'bg-black/55 border-white/20 hover:bg-black/70'
      }`}
    >
      {showVideoShareModal && (
        <ShareWebcamModal
          displayWebcamSelection={false}
          onSelectedDevice={setSelectedVideoDevice}
          selectedDeviceId={selectedVideoDevice}
        />
      )}
      <div
        className="size-12 relative flex items-center justify-center"
        onClick={() =>
          videoDevices.length === 0
            ? enableMediaDevices('video')
            : disableWebcam()
        }
      >
        {videoDevices.length === 0 ? (
          <>
            <Camera classes={'h-5 w-auto'} />
            <span className="add absolute -top-1 -right-1 z-10 scale-90">
              <PlusIcon />
            </span>
          </>
        ) : (
          <Camera classes={'h-5 w-auto'} />
        )}
      </div>
      {videoDevices.length > 0 && (
        <div className="menu relative">
          <Menu as="div">
            {({ open }) => (
              <>
                <MenuButton
                  className={`w-9 h-12 flex items-center justify-center rounded-r-full border-l border-white/20 ${
                    open ? 'bg-white/15' : 'bg-transparent'
                  }`}
                >
                  <ArrowUp />
                </MenuButton>
                <Transition
                  as={'div'}
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <div className="menu origin-top-right z-30 absolute ltr:left-auto md:ltr:left-0 ltr:-right-16 md:rtl:right-0 bottom-14 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl overflow-hidden p-2 w-max max-w-[min(90vw,280px)]">
                    <div className="title h-9 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-2 uppercase">
                      {t('landing.webcam-menu-title')}
                    </div>
                    {videoDevices.map((device, i) => (
                      <div className="" role="none" key={`${device.id}-${i}`}>
                        <MenuItem>
                          {() => (
                            <p
                              className={`min-h-9 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2`}
                              onClick={() => setSelectedVideoDevice(device.id)}
                            >
                              {device.label}
                              {selectedVideoDevice === device.id ? (
                                <CheckMarkIcon />
                              ) : (
                                ''
                              )}
                            </p>
                          )}
                        </MenuItem>
                      </div>
                    ))}

                    {isSupported && (
                      <>
                        <div className="divider w-[calc(100%+16px)] relative -left-2 h-1 bg-Gray-50 dark:bg-Gray-700 mt-2"></div>
                        <div className="title h-9 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-2 uppercase">
                          {t('landing.background-filter-title')}
                        </div>
                        <p
                          className="min-h-9 w-full flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-dark-secondary2 cursor-pointer"
                          onClick={() =>
                            dispatch(
                              updateShowVideoShareModal(!showVideoShareModal),
                            )
                          }
                        >
                          {t('landing.config-background-btn')}
                        </p>
                      </>
                    )}
                  </div>
                </Transition>
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  );
};

export default WebcamIcon;
