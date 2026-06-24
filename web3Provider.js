// web3Provider.js
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon } from 'wagmi/chains'; // Cambiamos de polygonAmoy a polygon

export const config = getDefaultConfig({
  appName: 'Camino al Mictlán',
  projectId: 'TU_PROJECT_ID_AQUI', // ¡No olvides poner tu ID de WalletConnect!
  chains: [polygon],
  ssr: true,
});