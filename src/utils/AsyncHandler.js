
const AsyncHandler = (funct) => {
    return (req, res, next) => {
        Promise.resolve(funct(req, res, next)).catch((error) => {
            console.error("Caught Error in AsyncHandler:", error);

            // Default status code
            let statusCode = error.statusCode || 500;

            // Special handling for MongoDB duplicate key error
            if (error.code === 11000) {
                statusCode = 409; // Conflict
                error.message = "Duplicate key error: resource already exists";
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || "An unexpected error occurred",
                errors: error.errors || [],
            });
        });
    };
};

export { AsyncHandler };



// thsi is Async method to create Async handler
/*
const AsyncHandler=(funct)=>{

    return async(req,res,next)=>{
try {
    await funct(req,res,next);
}
catch (error) {
    res.status(error.code||500).json({
        success:false,
        message:error.message,
    })
}
}
}
*/


//optimization of above removed curly braces and return---> hitesh sir also write this
/*const AsyncHandler = (funct) => async (req, res, next) => {
    try {
        await funct(req, res, next);
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message || 'An error occurred',
        });
    }
};

*/

