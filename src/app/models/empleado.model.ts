// Modelo interno de la UI (en español)
export interface Empleado {
  id: number;
  nombre: string;
  habilitado?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

// DTO que devuelve el backend
export interface EmployeeBackendDTO {
  id: number;
  name: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

// Payload para crear/actualizar
export interface EmployeePayloadDTO {
  name: string;
  available?: boolean;
}

// Respuesta paginada de la API
export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  total: number;
  next: string | null;
  prev: string | null;
  data: T[];
}

// Adaptador / Mapper (SOLID: SRP)
export class EmpleadoMapper {
  static fromDTO(dto: EmployeeBackendDTO): Empleado {
    return {
      id: dto.id,
      nombre: dto.name,
      habilitado: dto.available,
      creadoEn: dto.createdAt,
      actualizadoEn: dto.updatedAt
    };
  }

  static toPayload(nombre: string, habilitado?: boolean): EmployeePayloadDTO {
    const payload: EmployeePayloadDTO = {
      name: nombre.trim()
    };
    
    if (habilitado !== undefined) {
      payload.available = habilitado;
    }
    
    return payload;
  }
}