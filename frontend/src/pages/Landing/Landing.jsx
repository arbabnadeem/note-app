import React from "react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <>
      <div className="flex justify-center items-center h-[90vh] text-center">
        <div className="">
          <h1>
            <span className="text-4xl font-semibold">
              organize work and life
            </span>{" "}
            <br />
            <span className="text-4xl font-semibold text-primary">finally</span>
          </h1>
          <p className="text-sm text-gray-500 my-3">
            type just anything into the task field and Todolist <br />
            on-of-its-kind natural language recognition will instantly fill your
            to-do-list
          </p>
          <Link
            className="py-2 px-4 border border-blue-600 rounded mr-3"
            to="/signup"
          >
            Register
          </Link>
          <Link
            className="py-2 px-4 border border-blue-600 rounded"
            to="/login"
          >
            Login
          </Link>
        </div>{" "}
      </div>
    </>
  );
};

export default Landing;
