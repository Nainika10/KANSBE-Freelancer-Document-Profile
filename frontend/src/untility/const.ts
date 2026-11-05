import { HttpHeaders } from "@angular/common/http";

export const c_id = sessionStorage.getItem('c_id');
export const token = sessionStorage.getItem('Token');
export const fl_id = sessionStorage.getItem('fl_id');
export const project_id = sessionStorage.getItem('project_id');
export const admin_id = sessionStorage.getItem('admin_id');

export const header = () => {
    return {
        headers: new HttpHeaders()
            .set('Authorization', `Bearer ${sessionStorage.getItem('Token')}`,)
    }
}

// export const headerkey = () => {
//     return {
//         headers: new HttpHeaders()
//             .set('x-api-key', 'Vamshi@5025')
//     }
// }