import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendForgotPasswordEmail(email: string, token: string) {
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await this.mailerService.sendMail({
      to: email,
      subject: 'Quên mật khẩu - Web Bán Hàng',
      html: `
        <h3>Quên mật khẩu?</h3>
        <p>Vui lòng nhấn vào link dưới đây để đặt lại mật khẩu của bạn:</p>
        <a href="${url}">${url}</a>
        <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
      `,
    });
  }
}
