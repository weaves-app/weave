import {Component} from 'react';
import type {ReactNode} from 'react';

import {RecoveryScreen} from './recovery-screen';

export interface AppErrorBoundaryProps {
  readonly renderChildren: (rootGeneration: number) => ReactNode;
}

interface BoundaryState {
  readonly hasError: boolean;
  readonly rootGeneration: number;
}

interface RootContentProps extends AppErrorBoundaryProps {
  readonly rootGeneration: number;
}

function RootContent({renderChildren, rootGeneration}: RootContentProps): ReactNode {
  return renderChildren(rootGeneration);
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, BoundaryState> {
  override state: BoundaryState = {hasError: false, rootGeneration: 0};
  private reloadedGeneration = -1;

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return {hasError: true};
  }

  private reload(failedGeneration: number): void {
    if (
      !this.state.hasError ||
      this.state.rootGeneration !== failedGeneration ||
      this.reloadedGeneration === failedGeneration
    )
      return;

    this.reloadedGeneration = failedGeneration;
    this.setState({hasError: false, rootGeneration: failedGeneration + 1});
  }

  override render(): ReactNode {
    const {hasError, rootGeneration} = this.state;

    if (hasError) return <RecoveryScreen onReload={() => this.reload(rootGeneration)} />;

    return (
      <RootContent
        key={rootGeneration}
        rootGeneration={rootGeneration}
        renderChildren={this.props.renderChildren}
      />
    );
  }
}
