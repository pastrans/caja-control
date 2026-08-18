export type RolUsuario = 'Admin' | 'Cajero';
export type BackendRole = 'ADMIN' | 'CASHIER';

// Modelo de Dominio en UI
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  role: RolUsuario;
  habilitado: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

// DTO recibido del Backend
export interface UserBackendDTO {
  id: number;
  name: string;
  email: string;
  role: BackendRole;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

// DTO para Creación / Actualización
export interface CreateUserPayloadDTO {
  name: string;
  email: string;
  role: BackendRole;
  available: boolean;
  password?: string;
}

export interface UpdateUserPayloadDTO {
  name?: string;
  email?: string;
  role?: BackendRole;
  available?: boolean;
  password?: string;
}

// Mapper / Adapter
export class UsuarioMapper {
  static roleToDomain(role: BackendRole): RolUsuario {
    return role === 'ADMIN' ? 'Admin' : 'Cajero';
  }

  static roleToBackend(role: RolUsuario): BackendRole {
    return role === 'Admin' ? 'ADMIN' : 'CASHIER';
  }

  static fromDTO(dto: UserBackendDTO): Usuario {
    return {
      id: dto.id,
      nombre: dto.name,
      correo: dto.email,
      role: this.roleToDomain(dto.role),
      habilitado: dto.available,
      creadoEn: dto.createdAt,
      actualizadoEn: dto.updatedAt
    };
  }

  static toCreatePayload(formValue: any): CreateUserPayloadDTO {
    const payload: CreateUserPayloadDTO = {
      name: formValue.nombre.trim(),
      email: formValue.correo.trim(),
      role: this.roleToBackend(formValue.role),
      available: formValue.habilitado ?? true
    };
    if (formValue.contrasena) {
      payload.password = formValue.contrasena;
    }
    return payload;
  }

  static toUpdatePayload(formValue: any): UpdateUserPayloadDTO {
    const payload: UpdateUserPayloadDTO = {
      name: formValue.nombre.trim(),
      email: formValue.correo.trim(),
      role: this.roleToBackend(formValue.role),
      available: formValue.habilitado ?? true
    };
    if (formValue.contrasena && formValue.contrasena.trim() !== '') {
      payload.password = formValue.contrasena;
    }
    return payload;
  }
}