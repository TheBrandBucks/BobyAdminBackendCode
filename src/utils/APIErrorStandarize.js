//jub bhi hum ne aap me error ka koi likna ho ga to use hum
//  API Error class me se guzaare ge tak k error stadarized ho
class ApiError extends Error {

    // ye sab user pass kre ga
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode// node k Error.statusCode ki jagha user ka status code override kr do
        this.data = null// always data will null cus this is eroor
        this.message = message// node k Error.message ki jagha user ka message override kr do
        this.success = false;// error he is lea success failed
        this.errors = errors// node k Error.statusCode ki jagha user ka error override kr do

        //API Error ki file baaz okaat kafi bari hoti he
        // statck trace just ye find krta he k just kis jagha eroor he 
        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export { ApiError }