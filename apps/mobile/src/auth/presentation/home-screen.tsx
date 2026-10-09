import {Screen} from '../../components/screen';
import {Typography} from '../../components/typography';
import {Button} from '../../components/button';
import {Feedback} from '../../components/feedback';
import {useAuthController, useAuthState} from './auth-context';
import {authMessages} from './auth-messages';
export function HomeScreen(): React.JSX.Element {
  const controller = useAuthController();
  const state = useAuthState();
  return (
    <Screen>
      <Typography variant="title">Home</Typography>
      <Button
        label="Logout"
        onPress={() => {
          void controller.logout();
        }}
        loading={state.pending}
      />
      {state.pending && <Feedback message="Signing out…" busy />}
      {state.error && <Feedback message={authMessages[state.error.code]} />}
    </Screen>
  );
}
