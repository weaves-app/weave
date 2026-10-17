import {useSyncExternalStore} from 'react';
import {StyleSheet, View} from 'react-native';

import {tokens} from '@weave/design-tokens';

import {Button} from '../../../components/button';
import {Feedback} from '../../../components/feedback';
import {Typography, VARIANT} from '../../../components/typography';
import {MESSAGE} from '../../../localization/messages';
import {useTextTranslator} from '../../../localization/presentation/localization-context';
import type {
  NotificationController,
  NotificationStateReader,
} from '../application/notification-ports';
import {NOTIFICATION_PERMISSION, NOTIFICATION_STATUS} from '../domain/notification-models';

export interface NotificationControlsProps {
  readonly controller: NotificationController;
  readonly state: NotificationStateReader;
}

export function NotificationControls({
  controller,
  state,
}: NotificationControlsProps): React.JSX.Element | null {
  const view = useSyncExternalStore(state.subscribe, state.getState, state.getInitialState);
  const text = useTextTranslator();

  if (view.status === NOTIFICATION_STATUS.HIDDEN) return null;

  const enable =
    view.status === NOTIFICATION_STATUS.PERMISSION_NEEDED ||
    (view.status === NOTIFICATION_STATUS.DISABLED &&
      (view.canRequest || view.permission === NOTIFICATION_PERMISSION.ALLOWED));
  const settings = view.status === NOTIFICATION_STATUS.DISABLED && !enable;
  const message = view.busy
    ? MESSAGE.NOTIFICATIONS_CHECKING
    : view.status === NOTIFICATION_STATUS.READY
      ? MESSAGE.NOTIFICATIONS_READY
      : view.status === NOTIFICATION_STATUS.UNAVAILABLE
        ? MESSAGE.NOTIFICATIONS_UNAVAILABLE
        : view.permission === NOTIFICATION_PERMISSION.RESTRICTED
          ? MESSAGE.NOTIFICATIONS_RESTRICTED
          : view.status === NOTIFICATION_STATUS.DISABLED
            ? MESSAGE.NOTIFICATIONS_DISABLED
            : MESSAGE.NOTIFICATIONS_PENDING;

  return (
    <View style={styles.container}>
      <Typography variant={VARIANT.HEADING}>{text.text(MESSAGE.NOTIFICATIONS_TITLE)}</Typography>
      <Typography>{text.text(MESSAGE.NOTIFICATIONS_EXPLANATION)}</Typography>
      <Feedback message={text.text(message)} busy={view.busy} />
      {view.status !== NOTIFICATION_STATUS.READY && (
        <Button
          label={text.text(
            enable
              ? MESSAGE.NOTIFICATIONS_ENABLE
              : settings
                ? MESSAGE.NOTIFICATIONS_SETTINGS
                : MESSAGE.NOTIFICATIONS_RETRY,
          )}
          loading={view.busy}
          disabled={view.retryBlocked}
          onPress={() => {
            void (enable
              ? controller.enable()
              : settings
                ? controller.openSettings()
                : controller.refresh());
          }}
        />
      )}
      {view.retryBlocked && <Typography>{text.text(MESSAGE.NOTIFICATIONS_RETRY_LATER)}</Typography>}
    </View>
  );
}

const styles = StyleSheet.create({container: {gap: tokens.spacing.compact}});
