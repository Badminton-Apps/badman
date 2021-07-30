import {
  AuthenticatedRequest,
  BaseController,
  DataBaseHandler,
  logger,
  MailService,
  NotificationService
} from '@badvlasim/shared';
import { Response, Router } from 'express';
import { ApiError } from '../models/api.error';

export class EnrollmentController extends BaseController {
  private _path = '/enrollment';

  constructor(
    router: Router,
    private _authMiddleware,
    private _databaseService: DataBaseHandler,
    private _notificationService: NotificationService
  ) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.post(
      `${this._path}/finish/:clubId/:year`,
      this._authMiddleware,
      this._finsihedEnrollemnt
    );
  }

  private _finsihedEnrollemnt = async (request: AuthenticatedRequest, response: Response) => {
    try {
      if (
        request?.user == null ||
        !request?.user.hasAnyPermission([`${request.params.clubId}_enlist:team`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${request.params.clubId}_enlist:team`, 'add-any:club']
          },
          received: request?.user?.permissions
        });
        response.status(401).json(
          new ApiError({
            code: 401,
            message: "You don't have permission to do this "
          })
        );
        return;
      }

      const email = request.user.email;
      const clubId = request.params.clubId;
      const year = parseInt(request.params.year, 10);

      this._databaseService.addMetaForEnrollment(clubId, year);

      this._notificationService.clubEnrolled(email, clubId, year);
      response.json({ success: true });
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };
}
