import { Injectable, Logger } from '@nestjs/common';
import { NotificationsDto } from 'src/modules/notification/dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationEntity } from 'src/modules/notification/entities/notification.entity';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';

@Injectable()
export class NotificationService {
  private logger: Logger = new Logger('NotificationService');

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repository: Repository<NotificationEntity>,
  ) {}

  async getNotifications(): Promise<NotificationsDto> {
    this.logger.debug('Getting notifications list.');

    try {
      const notifications = await this.repository
        .createQueryBuilder('n')
        .orderBy('timestamp', 'DESC')
        .getMany();

      const totalUnread = await this.repository
        .createQueryBuilder()
        .where({ read: false })
        .getCount();

      return plainToClass(NotificationsDto, {
        notifications,
        totalUnread,
      });
    } catch (e) {
      this.logger.error('Unable to get notifications list', e);
      throw e;
    }
  }

  async readAllNotifications(): Promise<void> {
    this.logger.debug('Updating "read=true" status for all notifications.');

    try {
      await this.repository
        .createQueryBuilder('n')
        .update()
        .set({ read: true })
        .execute();
    } catch (e) {
      this.logger.error('Unable to "read" notifications', e);
      throw e;
    }
  }
}
