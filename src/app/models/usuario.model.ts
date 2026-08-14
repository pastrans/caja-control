export type RolUsuario = 'Admin' | 'Cajero';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  contrasena: string;
  role: RolUsuario;
}