import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { connectDB } from './src/config/db.js';
import Reservation from './src/models/Reservation.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../Datos/GES_NMAG_P2_22102024_31122025_C.csv');

const mapping = {
  numero_reserva: 'numeroReserva',
  fecha_creacion: 'fechaCreacion',
  usuario_creacion: 'usuarioCreacion',
  sucursal_creacion: 'sucursalCreacion',
  identificacion_cliente: 'identificacionCliente',
  cliente_nombre: 'clienteNombre',
  estado_reserva: 'estadoReserva',
  numero_documento_emision: 'numeroDocumentoEmision',
  tipo_documento: 'tipoDocumento',
  moneda: 'moneda',
  total_reserva: 'totalReserva',
  total_descuentos: 'totalDescuentos',
  total_recargos: 'totalRecargos',
  total_pagado: 'totalPagado',
  fecha_ultimo_pago: 'fechaUltimoPago',
  numero_viaje: 'numeroViaje',
  ruta: 'ruta',
  fecha_zarpe: 'fechaZarpe',
  nave: 'nave',
  equipo_id: 'equipoId',
  tipo_equipo: 'tipoEquipo',
  sub_tipo_equipo: 'subTipoEquipo',
  patente: 'patente',
  equipo_ancho: 'equipoAncho',
  equipo_mli: 'equipoMli',
  equipo_peso: 'equipoPeso',
  equipo_tara: 'equipoTara',
  equipo_peso_neto: 'equipoPesoNeto',
  tipo_carga: 'tipoCarga',
  id_detalle_carga: 'idDetalleCarga',
  condicion_carga: 'condicionCarga',
  usuario_facturacion: 'usuarioFacturacion',
  fecha_facturacion: 'fechaFacturacion',
  tipo_cliente: 'tipoCliente',
  observaciones: 'observaciones',
  unidad_medida: 'unidadMedida',
  total_rack_equipo: 'totalRackEquipo',
  total_descuentos_equipo: 'totalDescuentosEquipo',
  total_recargos_equipo: 'totalRecargosEquipo',
  observaciones_comercial: 'observacionesComercial',
};

const toNumber = (value) => {
  const number = Number(value.replace(/,/g, ''));
  return Number.isNaN(number) ? null : number;
};

const parseRow = (headers, row) => {
  const values = row.split(';');
  const item = {};

  headers.forEach((header, idx) => {
    const key = mapping[header] || header;
    const rawValue = values[idx]?.trim();
    const value = rawValue === 'NULL' || rawValue === '' ? null : rawValue;

    if (['totalReserva', 'totalDescuentos', 'totalRecargos', 'totalPagado', 'equipoPeso', 'equipoTara', 'equipoPesoNeto', 'totalRackEquipo', 'totalDescuentosEquipo', 'totalRecargosEquipo'].includes(key)) {
      item[key] = value ? toNumber(value) : null;
    } else {
      item[key] = value;
    }
  });

  return item;
};

const importData = async () => {
  await connectDB();
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    console.error('CSV vacío o no válido');
    process.exit(1);
  }

  const headers = lines[0].split(';').map((h) => h.trim());
  const records = lines.slice(1).map((line) => parseRow(headers, line));

  await Reservation.deleteMany({});
  await Reservation.insertMany(records);
  console.log(`Importados ${records.length} registros desde ${csvPath}`);
  process.exit(0);
};

importData().catch((error) => {
  console.error('Error importando datos:', error);
  process.exit(1);
});
