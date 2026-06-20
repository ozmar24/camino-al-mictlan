// web3Provider.js
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Camino al Mictlán',
  projectId: 'TU_PROJECT_ID_AQUI', // ¡No olvides poner tu ID de WalletConnect!
  chains: [polygonAmoy],
  ssr: true,
});