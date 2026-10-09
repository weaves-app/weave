import {useState} from 'react';
import type {ReactNode} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {tokens} from '@weave/design-tokens';
import googleLogo from '../../../assets/brand/google-g.png';
import {Button} from '../../components/button';
import {BrandLogo} from '../../components/brand-logo';
import {CodeField} from '../../components/code-field';
import {Feedback} from '../../components/feedback';
import {FormField} from '../../components/form-field';
import {Typography} from '../../components/typography';
import {authMessages} from './auth-messages';
import {AuthMethodTabs} from './auth-method-tabs';
import {AuthLayout} from './auth-layout';
import {PasswordTransition} from './password-transition';
import type {LoginBindings} from './use-login';
import {useLogin} from './use-login';

interface LoginPresentationProps {
  readonly login: LoginBindings;
}

interface LoginScrollProps {
  readonly challenge: boolean;
  readonly children: ReactNode;
}

function LoginScroll({challenge, children}: LoginScrollProps): React.JSX.Element {
  const [contentHeight, setContentHeight] = useState(0);
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[styles.content, !challenge && {minHeight: contentHeight}]}
      onContentSizeChange={(_, height) => {
        if (!challenge) setContentHeight((current) => Math.max(current, height));
      }}
    >
      {children}
    </ScrollView>
  );
}

function ActionArrow(): React.JSX.Element {
  return (
    <Text importantForAccessibility="no" accessibilityElementsHidden style={styles.actionArrow}>
      →
    </Text>
  );
}

function LoginForm({login}: LoginPresentationProps): React.JSX.Element {
  const {state} = login;
  const emailCode = state.attempt.method === 'emailCode';
  return (
    <>
      <View style={styles.loginHeader}>
        <View style={styles.heading}>
          <Typography variant="heading">Welcome back</Typography>
          <Typography variant="supporting">Sign in to your Weave workspace.</Typography>
        </View>
      </View>
      <Button
        label="Continue with Google"
        variant="outline"
        onPress={login.google}
        disabled={state.pending}
        leading={<Image source={googleLogo} style={styles.googleIcon} accessible={false} />}
      />
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Typography variant="caption">or continue with email</Typography>
        <View style={styles.dividerLine} />
      </View>
      <AuthMethodTabs
        method={state.attempt.method}
        disabled={state.pending}
        onSelect={login.selectMethod}
      />
      <View style={styles.form}>
        <FormField
          label="Email"
          value={login.email}
          onChangeText={login.setEmail}
          keyboardType="email-address"
          placeholder="you@company.com"
          autoComplete="email"
          disabled={state.pending}
        />
        <View>
          <PasswordTransition
            visible={!emailCode}
            value={login.password}
            onChangeText={login.setPassword}
            disabled={state.pending}
            action={
              <Button
                label={emailCode ? 'Send code' : 'Log in'}
                onPress={login.submit}
                loading={state.pending}
                trailing={<ActionArrow />}
              />
            }
          />
        </View>
      </View>
    </>
  );
}

function AuthHeader({login}: LoginPresentationProps): React.JSX.Element {
  const {state} = login;
  const challenge = Boolean(state.attempt.attemptId);
  return (
    <View style={styles.authHeader}>
      <View style={styles.headerSpacer}>
        {challenge && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose another method"
            accessibilityState={{disabled: state.pending}}
            disabled={state.pending}
            onPress={() => login.selectMethod('password')}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        )}
      </View>
      <BrandLogo width={128} />
      <View style={styles.headerSpacer} />
    </View>
  );
}

function VerificationForm({login}: LoginPresentationProps): React.JSX.Element {
  const {state} = login;
  return (
    <>
      <View style={styles.challengeHeading}>
        <Typography variant="heading">
          {state.attempt.codePurpose === 'deviceTrust' ? 'Verify this device' : 'Check your email'}
        </Typography>
        <View style={styles.emailDescription}>
          <Typography variant="supporting">Enter the verification code sent to</Typography>
          <Text style={styles.email}>{login.email.trim()}</Text>
        </View>
      </View>
      <CodeField value={login.code} onChangeText={login.setCode} disabled={state.pending} />
      <Button
        label="Verify code"
        onPress={login.submit}
        disabled={state.pending}
        loading={state.pending && state.attempt.stage === 'verifying'}
        trailing={<ActionArrow />}
      />
      <View style={styles.resend}>
        <Typography variant="caption">Didn't receive it?</Typography>
        <Button
          label="Resend code"
          variant="text"
          onPress={login.resend}
          disabled={state.pending}
          loading={state.pending && state.attempt.stage === 'submitting'}
        />
      </View>
    </>
  );
}

export function LoginScreen(): React.JSX.Element {
  const login = useLogin();
  const {state} = login;
  const challenge = Boolean(state.attempt.attemptId);
  const {width, fontScale} = useWindowDimensions();
  return (
    <AuthLayout>
      <AuthHeader login={login} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LoginScroll key={`${challenge}-${width}-${fontScale}`} challenge={challenge}>
          <View style={styles.layout}>
            {challenge ? <VerificationForm login={login} /> : <LoginForm login={login} />}
            {state.pending && (
              <Feedback
                message={
                  challenge
                    ? state.attempt.stage === 'verifying'
                      ? 'Verifying code…'
                      : 'Sending code…'
                    : 'Signing in…'
                }
                busy
              />
            )}
            {state.error && <Feedback message={authMessages[state.error.code]} />}
            {state.attempt.retryAfterSeconds !== undefined && (
              <Feedback message={`Try again after ${state.attempt.retryAfterSeconds} seconds.`} />
            )}
          </View>
        </LoginScroll>
      </KeyboardAvoidingView>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: tokens.colors.background},
  content: {
    flexGrow: 1,
    padding: tokens.spacing.large,
    paddingVertical: tokens.spacing.extraLarge,
    justifyContent: 'flex-start',
  },
  layout: {width: '100%', maxWidth: 400, alignSelf: 'center', gap: tokens.spacing.large},
  loginHeader: {gap: tokens.spacing.large},
  heading: {gap: tokens.spacing.small},
  form: {gap: tokens.spacing.large},
  googleIcon: {width: 20, height: 20, resizeMode: 'contain'},
  divider: {flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.compact},
  dividerLine: {flex: 1, height: 1, backgroundColor: tokens.colors.border},
  actionArrow: {fontSize: 20, color: tokens.colors.onPrimary},
  authHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 64,
    marginHorizontal: tokens.spacing.large,
    marginTop: tokens.spacing.small,
  },
  backButton: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radii.round,
  },
  backArrow: {fontSize: 22, color: tokens.colors.text},
  headerSpacer: {width: 48},
  challengeHeading: {gap: tokens.spacing.medium},
  emailDescription: {gap: tokens.spacing.tiny},
  email: {
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.typeSizes.supporting,
    color: tokens.colors.text,
  },
  resend: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap'},
});
