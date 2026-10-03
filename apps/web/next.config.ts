import type {NextConfig} from 'next';
const config: NextConfig = {output: 'standalone', transpilePackages: ['@weave/design-tokens']};
export default config;
