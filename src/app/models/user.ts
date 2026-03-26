export class User {
    user_id: number;
    login: string;

	password: string;

    // Backend-managed password hash (not used by frontend auth flow)
    pass_d: string;
    firstname: string;
    lastname: string;
    share: number;
    phone: string;
    email: string;
    permissions: number;
    aavso_id: string;
    ftp_login: string;
    ftp_pass: string;

    // This is Angular extension to use JWT
    token: string;
}
