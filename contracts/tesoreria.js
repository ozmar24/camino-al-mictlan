// contracts/tesoreria.js
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xAd479C0620E9C41F1ACCd8D9c4a81e9E7D4f76ae"; // ← Tu contrato en Amoy

const ABI = [
    "function distribuirYQuemarTokens(uint256 _cantidadTotal) external",
    "function walletBovedaUsuarios() view returns (address)",
    "function walletGas() view returns (address)",
    "function walletEventosMarketing() view returns (address)",
    "function walletReservaMaestra() view returns (address)",
    "function porcBoveda() view returns (uint256)",
    "function porcGas() view returns (uint256)",
    "function porcEventos() view returns (uint256)",
    "function porcReserva() view returns (uint256)",
    "function porcQuema() view returns (uint256)",
    "function tokenSoulgeist() view returns (address)",
    "function balanceOf(address account) view returns (uint256)"
];

let provider;
let signer;
let contrato;

// Conectar con MetaMask
export async function conectarContrato() {
    if (typeof window.ethereum === "undefined") {
        alert("MetaMask no está instalado");
        return null;
    }

    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        contrato = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        
        console.log("✅ Conectado correctamente al contrato Tesorería Mictlán");
        return contrato;
    } catch (error) {
        console.error("Error al conectar contrato:", error);
        alert("Error al conectar con el contrato");
        return null;
    }
}

// Ejemplo: Obtener balance de SG de una wallet
export async function obtenerBalanceSG(direccion) {
    if (!contrato) await conectarContrato();
    try {
        // Como el contrato ya sabe que es un contrato de tokens, 
        // llamas a balanceOf directamente sobre 'contrato'
        const balance = await contrato.balanceOf(direccion);
        return ethers.formatUnits(balance, 18);
    } catch (e) {
        console.error("Error al obtener balance:", e);
        return "0";
    }
}

// Ejemplo: Ver porcentajes
export async function obtenerPorcentajes() {
    if (!contrato) await conectarContrato();
    return {
        boveda: await contrato.porcBoveda(),
        gas: await contrato.porcGas(),
        eventos: await contrato.porcEventos(),
        reserva: await contrato.porcReserva(),
        quema: await contrato.porcQuema()
    };
}