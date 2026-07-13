import { Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";

export abstract class BaseController {

    protected ok<T>(

        res:Response,

        message:string,

        data?:T

    ){

        return res.json(

            new ApiResponse(

                true,

                message,

                data

            )

        );

    }

    protected created<T>(

        res:Response,

        message:string,

        data?:T

    ){

        return res.status(201).json(

            new ApiResponse(

                true,

                message,

                data

            )

        );

    }

}