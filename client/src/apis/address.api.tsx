import type { Address } from '~/types/user.type';
import type { SuccessResponseApi } from '~/types/utils.type';
import http from '~/utils/http';

export type AddressRequest = Omit<Address, 'id' | 'user_id'>;

const addressApi = {
  getAddresses() {
    return http.get<SuccessResponseApi<Address[]>>('addresses');
  },
  getAddress(id: string) {
    return http.get<SuccessResponseApi<Address>>(`addresses/${id}`);
  },
  createAddress(body: AddressRequest) {
    return http.post<SuccessResponseApi<Address>>('addresses', body);
  },
  updateAddress(id: string, body: Partial<AddressRequest>) {
    return http.patch<SuccessResponseApi<Address>>(`addresses/${id}`, body);
  },
  deleteAddress(id: string) {
    return http.delete(`addresses/${id}`);
  },
  setDefaultAddress(id: string) {
    return http.patch<SuccessResponseApi<Address>>(`addresses/${id}/default`);
  }
};

export default addressApi;
