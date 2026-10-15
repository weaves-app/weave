import {Screen} from '../../components/screen';
import {Typography, VARIANT} from '../../components/typography';
import {Button} from '../../components/button';
import {Feedback} from '../../components/feedback';
import {useAuthController, useAuthSelector} from './auth-context';
import {authMessages} from './auth-messages';

export function HomeScreen(): React.JSX.Element {
  const controller = useAuthController();
  const pending = useAuthSelector((state) => state.pending);
  const error = useAuthSelector((state) => state.error);

  return (
    <Screen>
      <Typography variant={VARIANT.TITLE}>Home</Typography>
      <Button
        label="Logout"
        onPress={() => {
          void controller.logout();
        }}
        loading={pending}
      />
      {pending && <Feedback message="Signing out…" busy />}
      {error && <Feedback message={authMessages[error.code]} />}
    </Screen>
  );
}
