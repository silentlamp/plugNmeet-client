import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import { Microphone } from '../../assets/Icons/Microphone';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import { inputMediaDeviceKind } from '../../helpers/utils';

interface MicrophoneIconProps {
  audioDevices: IMediaDevice[];
  enableMediaDevices(type: inputMediaDeviceKind): Promise<void>;
  disableMic(): void;
  setSelectedAudioDevice: (value: SetStateAction<string>) => void;
  selectedAudioDevice: string;
}

/**
 * Lobby mic control — circular glass dock for the ZenLeader preview stage.
 */
const MicrophoneIcon = ({
  audioDevices,
  setSelectedAudioDevice,
  selectedAudioDevice,
  enableMediaDevices,
  disableMic,
}: MicrophoneIconProps) => {
  const { t } = useTranslation();
  const isOn = audioDevices.length > 0;

  return (
    <div
      className={`microphone-wrap relative cursor-pointer flex items-center rounded-full border backdrop-blur-md transition-all duration-300 text-white ${
        isOn
          ? 'bg-Blue/90 border-Blue/40 shadow-[0_0_0_3px_rgba(135,199,68,0.28)]'
          : 'bg-black/55 border-white/20 hover:bg-black/70'
      }`}
    >
      <div
        className="size-12 relative flex items-center justify-center"
        onClick={() =>
          audioDevices.length === 0 ? enableMediaDevices('audio') : disableMic()
        }
      >
        {audioDevices.length === 0 ? (
          <>
            <Microphone classes={'h-5 w-auto'} />
            <span className="add absolute -top-1 -right-1 z-10 scale-90">
              <PlusIcon />
            </span>
          </>
        ) : (
          <Microphone classes={'h-5 w-auto'} />
        )}
      </div>
      {audioDevices.length > 0 && (
        <div className="menu relative">
          <Menu>
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
                  <div className="menu origin-top-right z-30 absolute ltr:-left-28 md:ltr:left-0 rtl:right-0 bottom-14 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl overflow-hidden p-2 w-max max-w-[min(90vw,280px)]">
                    <div className="title h-9 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-2 uppercase">
                      {t('landing.mic-menu-title')}
                    </div>
                    {audioDevices.map((device, i) => (
                      <div
                        className=""
                        role="none"
                        key={`${device.id}-${i}`}
                        onClick={() => setSelectedAudioDevice(device.id)}
                      >
                        <MenuItem>
                          {() => (
                            <p className="min-h-9 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2">
                              {device.label}
                              {selectedAudioDevice === device.id ? (
                                <CheckMarkIcon />
                              ) : (
                                ''
                              )}
                            </p>
                          )}
                        </MenuItem>
                      </div>
                    ))}
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

export default MicrophoneIcon;
