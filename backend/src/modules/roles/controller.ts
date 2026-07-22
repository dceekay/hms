import { Response,NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { RoleService } from "./service";

function getParamId(req: AuthRequest): string {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class RoleController extends BaseController{

    constructor(

        private readonly service = new RoleService()

    ){

        super();

    }

    getAll = async(req:AuthRequest,res:Response,next:NextFunction)=>{

        try{

            this.ok(

                res,

                "Roles fetched successfully",

                await this.service.all()

            );

        }catch(error){

            next(error);

        }

    }

    getOne = async(req:AuthRequest,res:Response,next:NextFunction)=>{

        try{

            this.ok(

                res,

                "Role fetched",

                await this.service.byId(getParamId(req))

            );

        }catch(error){

            next(error);

        }

    }

    create = async(req:AuthRequest,res:Response,next:NextFunction)=>{

        try{

            this.created(

                res,

                "Role created",

                await this.service.create(req.body)

            );

        }catch(error){

            next(error);

        }

    }

    update = async(req:AuthRequest,res:Response,next:NextFunction)=>{

        try{

            this.ok(

                res,

                "Role updated",

                await this.service.update(getParamId(req),req.body)

            );

        }catch(error){

            next(error);

        }

    }

    assignPermissions = async(req:AuthRequest,res:Response,next:NextFunction)=>{

        try{

            this.ok(

                res,

                "Role permissions updated",

                await this.service.assignPermissions(getParamId(req), req.body.permissionIds)

            );

        }catch(error){

            next(error);

        }

    }

    delete = async(req:AuthRequest,res:Response,next:NextFunction)=>{

        try{

            await this.service.delete(getParamId(req));

            this.ok(res,"Role deleted");

        }catch(error){

            next(error);

        }

    }

}
