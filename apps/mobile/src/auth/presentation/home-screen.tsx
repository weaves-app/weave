import {useTextTranslator} from '../../localization/presentation/localization-context';
import {MESSAGE} from '../../localization/messages';
import {Screen} from '../../components/screen';
import {Typography, VARIANT} from '../../components/typography';
import {Button} from '../../components/button';
import {Feedback} from '../../components/feedback';
import {useAuthController, useAuthSelector} from './auth-context';
import {resolveAuthMessage} from './auth-messages';

export function HomeScreen(): React.JSX.Element {
  const text = useTextTranslator();
  const controller = useAuthController();
  const pending = useAuthSelector((state) => state.pending);
  const error = useAuthSelector((state) => state.error);

  return (
    <Screen>
      <Typography variant={VARIANT.TITLE}>{text.text(MESSAGE.HOME_TITLE)}</Typography>
      <Button
        label={text.text(MESSAGE.HOME_LOGOUT)}
        onPress={() => {
          void controller.logout();
        }}
        loading={pending}
      />
      {pending && <Feedback message={text.text(MESSAGE.STATUS_SIGNING_OUT)} busy />}
      {error && <Feedback message={resolveAuthMessage(error.code, text)} />}
    </Screen>
  );
}
